import "@shopify/polaris/build/esm/styles.css";
import { Page, Layout, Card, Text, Grid, BlockStack, Button, AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { useNavigate } from "react-router";

export default function Index() {
  const navigate = useNavigate();

  return (
    <AppProvider i18n={enTranslations}>
      <Page title="SahiGlow Bundle Offers">
        <Layout>
          <Layout.Section>
            <Grid>
              {/* Cross Sell Card */}
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                <Card>
                  <BlockStack gap="200" align="center">
                    <Text variant="headingMd" as="h3">⚪ Cross Sell</Text>
                    <Text as="p">Frequently Bought Together ✨</Text>
                    <Button fullWidth disabled>Select Offer</Button>
                  </BlockStack>
                </Card>
              </Grid.Cell>

              {/* Volume Discount Card (Active) */}
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                <Card background="bg-surface-success">
                  <BlockStack gap="200" align="center">
                    <Text variant="headingMd" as="h3">✅ Volume Discount</Text>
                    <Text as="p">Buy More & Save 💰</Text>
                    <Button variant="primary" fullWidth onClick={() => navigate("/app/volume-discount")}>
                      Configure Offer
                    </Button>
                  </BlockStack>
                </Card>
              </Grid.Cell>

              {/* Bundle Card */}
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                <Card>
                  <BlockStack gap="200" align="center">
                    <Text variant="headingMd" as="h3">⚪ Bundle</Text>
                    <Text as="p">Bundle & Save 🛒</Text>
                    <Button fullWidth disabled>Select Offer</Button>
                  </BlockStack>
                </Card>
              </Grid.Cell>

              {/* Mix & Match Card */}
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                <Card>
                  <BlockStack gap="200" align="center">
                    <Text variant="headingMd" as="h3">⚪ Mix & Match</Text>
                    <Text as="p">Buy 3, Enjoy 50% Off 🎁</Text>
                    <Button fullWidth disabled>Select Offer</Button>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            </Grid>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}