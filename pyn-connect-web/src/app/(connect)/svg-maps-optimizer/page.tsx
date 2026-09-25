import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { SvgOptimizerScreen } from '~/core/screens/connect/svgOptimizer/svgOptimizer.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="SVG Maps Optimizer" demo>
      <SvgOptimizerScreen />
    </ConnectScreenTemplate>
  );
}
