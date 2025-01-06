import RxInfo from './rxinfo';
import MainRadioVolume from './main-radio-volume';
import UnicomGuardBar from './unicom-guard';
import { useMediaQuery } from 'react-responsive';
import { useEffect } from 'react';
import useRadioState from '@renderer/store/radioStore';

const TopBarContainer = () => {
  const isMediumScreen = useMediaQuery({ minWidth: '940px' });
  const [showingUnicomBar, setShowingUnicomBar] = useRadioState((state) => [
    state.showingUnicomBar,
    state.setShowingUnicomBar
  ]);
  useEffect(() => {
    if (isMediumScreen && !showingUnicomBar) {
      setShowingUnicomBar(true);
    } else if (!isMediumScreen && showingUnicomBar) {
      setShowingUnicomBar(false);
    }
  }, [isMediumScreen]);

  return (
    <div className="w-100 d-flex">
      {/* Main container with the centered content and right-aligned text */}
      <div className="w-100 d-flex justify-content-between align-items-center">
        {/* Left-aligned element */}
        <div className="d-flex align-items-center">
          <MainRadioVolume />
        </div>

        {/* Center element */}
        <div className="d-flex align-items-center justify-content-center flex-grow-1">
          <UnicomGuardBar />
        </div>

        {/* Right-aligned element */}
        <div className="d-flex align-items-center">
          <RxInfo />
        </div>
      </div>
    </div>
  );
};

export default TopBarContainer;
