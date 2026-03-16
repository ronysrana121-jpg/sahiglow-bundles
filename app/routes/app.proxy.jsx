import db from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return new Response(JSON.stringify({ error: "Missing shop parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch tiers for this specific shop from Prisma
  const tiers = await db.volumeTier.findMany({
    where: { shop: shop },
    orderBy: { quantity: 'asc' }
  });

  // Just return the data object directly in v7
  return { tiers };
};

// This handles creating the discount automatically when they click "Add to Cart"
export const action = async ({ request }) => {
  const { admin } = await authenticate.public.appProxy(request);
  const formData = await request.formData();
  const discountPercent = formData.get("discount");

  // Create a basic "Price Rule" discount code via GraphQL
  const response = await admin.graphql(
    `#graphql
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          codeDiscount {
            ... on DiscountCodeBasic {
              codes(first: 1) {
                nodes {
                  code
                }
              }
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
          title: `Volume Save ${discountPercent}%`,
          code: `SAVE${discountPercent}-${Math.floor(Math.random() * 1000)}`,
          startsAt: new Date().toISOString(),
          customerSelection: { all: true },
          customerGets: {
            value: { percentage: parseFloat(discountPercent) / 100 },
            items: { all: true }
          },
          appliesOncePerCustomer: false
        }
      }
    }
  );

  const data = await response.json();
  
  if (data.errors || data.data.discountCodeBasicCreate.userErrors.length > 0) {
     return { error: "Discount creation failed" };
  }

  const code = data.data.discountCodeBasicCreate.codeDiscountNode.codeDiscount.codes.nodes[0].code;

  return { discountCode: code };
};