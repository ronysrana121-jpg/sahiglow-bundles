import db from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) return Response.json({ error: "Missing shop" }, { status: 400 });
  const tiers = await db.volumeTier.findMany({ where: { shop }, orderBy: { quantity: "asc" } });
  return Response.json({ tiers });
};

export const action = async ({ request }) => {  
  try {
    const { admin } = await authenticate.public.appProxy(request);
    if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const discountPercent = formData.get("discount");
    const qty = formData.get("quantity");
    const productId = formData.get("productId");

    const code = `SAHI-${discountPercent}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const productGid = `gid://shopify/Product/${productId}`;

    const response = await admin.graphql(
      `#graphql
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                codes(first: 1) { nodes { code } }
              }
            }
          }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          basicCodeDiscount: {
            title: `Sahiglow Bundle - ${discountPercent}% Off`,
            code: code,
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            customerSelection: { all: true },
            customerGets: {
              value: { percentage: parseFloat(discountPercent) / 100 },
              items: { products: { productsToAdd: [productGid] } }
            },
            appliesOncePerCustomer: true,
            minimumRequirement: { quantity: { greaterThanOrEqualToQuantity: String(qty) } },
            combinesWith: {
              orderDiscounts: true,
              productDiscounts: true,
              shippingDiscounts: true
            }
          },
        },
      }
    );

    const responseJson = await response.json();
    if (responseJson.data?.discountCodeBasicCreate?.userErrors?.length > 0) throw new Error("GraphQL Error");

    const generatedCode = responseJson.data.discountCodeBasicCreate.codeDiscountNode.codeDiscount.codes.nodes[0].code;
    return Response.json({ code: generatedCode });

  } catch (error) {
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
};