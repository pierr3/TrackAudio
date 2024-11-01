import RxInfo from './rxinfo';
import GlobalRadioGain from './global-radio-gain';
import UnicomGuardBar from './unicom-guard';
import { useMediaQuery } from 'react-responsive';

const TopBarContainer = () => {
  const isWideScreen = useMediaQuery({ minWidth: '790px' });

  return (
    <div className="w-100 d-flex">
      {/* Main container with the centered content and right-aligned text */}
      <div className="w-100 d-flex justify-content-between align-items-center">
        {/* Left-aligned element */}
        {isWideScreen && (
          <div className="d-flex align-items-center">
            <GlobalRadioGain />
          </div>
        )}

        {/* Center element */}
        <div className="d-flex align-items-center justify-content-center flex-grow-1">
          <UnicomGuardBar />
        </div>

        {/* Right-aligned element */}
        {isWideScreen && (
          <div className="d-flex align-items-center">
            <RxInfo />
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBarContainer;
