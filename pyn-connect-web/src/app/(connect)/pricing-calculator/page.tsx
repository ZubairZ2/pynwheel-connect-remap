import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { PricingCalculatorScreen } from '~/core/screens/connect/pricingCalculator/pricingCalculator.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Pricing Calculator">
      <PricingCalculatorScreen />
    </ConnectScreenTemplate>
  );
}
