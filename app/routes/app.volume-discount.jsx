import "@shopify/polaris/build/esm/styles.css";
import { Page, Layout, Card, Text, TextField, Button, BlockStack, InlineStack, AppProvider, Banner } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { useState } from "react";
import { useNavigate, useLoaderData, useSubmit, useActionData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// 1. LOADER: Loads saved tiers from your database when the page opens
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const savedTiers = await db.volumeTier.findMany({
    where: { shop: session.shop },
    orderBy: { quantity: 'asc' }
  });
  
  // If database is empty, show default tiers
  if (savedTiers.length === 0) {
    return { tiers: [
      { id: "1", quantity: "2", discount: "10", badge: "" },
      { id: "2", quantity: "3", discount: "20", badge: "Most Popular" }
    ]};
  }
  return { tiers: savedTiers };
};

// 2. ACTION: Saves your tiers to the database when you click "Save"
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const tiersData = JSON.parse(formData.get("tiers"));

  // Delete old settings for this shop, then save the new ones
  await db.volumeTier.deleteMany({ where: { shop: session.shop } });
  
  const newTiers = tiersData.map(tier => ({
    shop: session.shop,
    quantity: tier.quantity.toString(),
    discount: tier.discount.toString(),
    badge: tier.badge || ""
  }));

  await db.volumeTier.createMany({ data: newTiers });
  return { success: true };
};

export default function VolumeDiscount() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const nav = useNavigation();
  const loaderData = useLoaderData();
  const actionData = useActionData();
  
  const [tiers, setTiers] = useState(loaderData.tiers);
  const isSaving = nav.state === "submitting";

  const handleAddTier = () => {
    const nextQty = tiers.length > 0 ? parseInt(tiers[tiers.length - 1].quantity) + 1 : 2;
    setTiers([...tiers, { id: Date.now().toString(), quantity: nextQty.toString(), discount: "", badge: "" }]);
  };

  const handleRemoveTier = (idToRemove) => {
    setTiers(tiers.filter(tier => tier.id !== idToRemove));
  };

  const handleUpdateTier = (id, field, value) => {
    setTiers(tiers.map(tier => tier.id === id ? { ...tier, [field]: value } : tier));
  };

  // Triggers the ACTION function above
  const handleSave = () => {
    const formData = new FormData();
    formData.append("tiers", JSON.stringify(tiers));
    submit(formData, { method: "POST" });
  };

  return (
    <AppProvider i18n={enTranslations}>
      <Page 
        title="Create Volume Discount" 
        backAction={{ content: 'Dashboard', onAction: () => navigate('/app') }}
      >
        <Layout>
          <Layout.Section>
            {/* Shows a success message after saving */}
            {actionData?.success && (
              <div style={{ marginBottom: "16px" }}>
                <Banner title="Offer saved successfully to the database!" tone="success" />
              </div>
            )}
            <Card>
              <BlockStack gap="500">
                <Text variant="headingMd" as="h2">Buy More & Save 💰</Text>
                
                {tiers.map((tier, index) => (
                  <div key={tier.id} style={{ borderBottom: index < tiers.length - 1 ? '1px solid #ebebeb' : 'none', paddingBottom: '16px' }}>
                    <InlineStack align="space-between" blockAlign="center">
                      
                      <InlineStack gap="400" blockAlign="center">
                        <div style={{width: '100px'}}>
                          <TextField 
                            label="Buy Quantity" 
                            type="number"
                            value={tier.quantity} 
                            onChange={(val) => handleUpdateTier(tier.id, 'quantity', val)} 
                            autoComplete="off" 
                          />
                        </div>
                        <div style={{width: '120px'}}>
                          <TextField 
                            label="Discount Amount" 
                            type="number"
                            value={tier.discount} 
                            onChange={(val) => handleUpdateTier(tier.id, 'discount', val)} 
                            suffix="%" 
                            autoComplete="off" 
                          />
                        </div>
                        <div style={{width: '180px'}}>
                          <TextField 
                            label="Badge (Optional)" 
                            placeholder="e.g. Hot, Best Value"
                            value={tier.badge || ""} 
                            onChange={(val) => handleUpdateTier(tier.id, 'badge', val)} 
                            autoComplete="off" 
                          />
                        </div>
                      </InlineStack>

                      <InlineStack gap="300" blockAlign="center">
                        {tiers.length > 1 && (
                          <Button variant="plain" tone="critical" onClick={() => handleRemoveTier(tier.id)}>
                            Remove
                          </Button>
                        )}
                      </InlineStack>

                    </InlineStack>
                  </div>
                ))}

                <InlineStack>
                  <Button onClick={handleAddTier}>+ Add Discount Tier</Button>
                </InlineStack>

                <div style={{ marginTop: '8px' }}>
                  <Button variant="primary" size="large" onClick={handleSave} loading={isSaving}>
                    Save Offer to Store
                  </Button>
                </div>

              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}