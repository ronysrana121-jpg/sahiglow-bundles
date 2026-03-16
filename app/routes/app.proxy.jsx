import { json } from "@react-router/node";
import db from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) return json({ error: "Missing shop" }, { status: 400 });

  const tiers = await db.volumeTier.findMany({
    where: { shop },
    orderBy: { quantity: "asc" },
  });

  return json({ tiers });
};

// This "Action" will create the discount code when the button is clicked
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.public.appProxy(request);
  const formData = await request.formData();
  const discountPercent = formData.get("discount");
  const qty = formData.get("quantity");

  // Generate a unique code like: SAHIGLOW-10-OFF-1234
  const code = `SAHI-${discountPercent}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  // Use Shopify GraphQL to create a "Basic Discount"
  const response = await admin.graphql(
    `#graphql
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        discountCode {
          id
          codes(first: 1) {
            nodes {
              code
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        basicCodeDiscount: {
          title: `Sahiglow Bundle - ${discountPercent}% Off`,
          code: code,
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Valid for 1 hour
          customerSelection: { all: true },
          customerGets: {
            value: { percentage: parseFloat(discountPercent) / 100 },
            items: { all: true }
          },
          appliesOncePerCustomer: true,
          minimumRequirement: {
            quantity: { greaterThanOrEqualToQuantity: qty }
          }
        },
      },
    }
  );

  const responseJson = await response.json();
  const generatedCode = responseJson.data.discountCodeBasicCreate.discountCode.codes.nodes[0].code;

  return json({ code: generatedCode });
};