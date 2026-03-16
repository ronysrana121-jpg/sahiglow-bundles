import db from "../db.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) return Response.json({ error: "Missing shop" }, { status: 400 });

  const tiers = await db.volumeTier.findMany({
    where: { shop },
    orderBy: { quantity: "asc" },
  });

  return Response.json({ tiers });
};

// This "Action" will create the discount code when the button is clicked
export const action = async ({ request }) => {
  console.log("🚀 --- PROXY POST REQUEST TRIGGERED ---");
  
  try {
    const { admin } = await authenticate.public.appProxy(request);
    
    if (!admin) {
      console.error("❌ Authentication Failed: Shopify blocked the proxy request.");
      return Response.json({ error: "Unauthorized App Proxy" }, { status: 401 });
    }

    const formData = await request.formData();
    const discountPercent = formData.get("discount");
    const qty = formData.get("quantity");
    console.log(`📦 Requesting Discount: ${discountPercent}% for ${qty} items`);

    const code = `SAHI-${discountPercent}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Updated GraphQL structure for Shopify's newer API versions
    const response = await admin.graphql(
      `#graphql
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                codes(first: 1) {
                  nodes {
                    code
                  }
                }
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
              items: { all: true }
            },
            appliesOncePerCustomer: true,
            minimumRequirement: { quantity: { greaterThanOrEqualToQuantity: parseInt(qty) } }
          },
        },
      }
    );

    const responseJson = await response.json();
    
    if (responseJson.data?.discountCodeBasicCreate?.userErrors?.length > 0) {
      console.error("❌ Shopify GraphQL Error:", JSON.stringify(responseJson.data.discountCodeBasicCreate.userErrors));
      return Response.json({ error: "Failed to create discount" }, { status: 400 });
    }

    // Updated extraction path to match the new GraphQL payload
    const generatedCode = responseJson.data.discountCodeBasicCreate.codeDiscountNode.codeDiscount.codes.nodes[0].code;
    console.log(`✅ Successfully generated code: ${generatedCode}`);

    return Response.json({ code: generatedCode });

  } catch (error) {
    console.error("💥 MASSIVE SERVER ERROR:", error.message);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
};