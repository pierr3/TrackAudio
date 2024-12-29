import RxInfo from './rxinfo';
import MainRadioVolume from './main-radio-volume';
import UnicomGuardBar from './unicom-guard';
import { useMediaQuery } from 'react-responsive';

const TopBarContainer = () => {
  const isMediumScreen = useMediaQuery({ minWidth: '765px' });
  const isSmallScreen = useMediaQuery({ minWidth: '630px' });

  return (
    <div className="w-100 d-flex">
      {/* Main container with the centered content and right-aligned text */}
      <div className="w-100 d-flex justify-content-between align-items-center">
        {/* Left-aligned element */}
        {isMediumScreen && (
          <div className="d-flex align-items-center">
            <MainRadioVolume />
          </div>
        )}

        {/* Center element */}
        <div className="d-flex align-items-center justify-content-center flex-grow-1">
          <UnicomGuardBar />
        </div>

        {/* Right-aligned element */}
        {isSmallScreen && (
          <div className="d-flex align-items-center">
            <RxInfo />
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBarContainer;
