import RxInfo from '../rxinfo';
import UnicomGuardBar from './unicom-guard';

const UnicomGuardContainer = () => {
  return (
    <div className="w-100 my-2 d-flex" style={{ height: '35px' }}>
      {/* Main container with the centered content and right-aligned text */}
      <div className="w-100 d-flex justify-content-center align-items-center position-relative">
        {/* Center element */}
        <div className="d-flex align-items-center">
          <UnicomGuardBar />
        </div>

        {/* Right-aligned text absolute positioned */}
        <div className="position-absolute end-0 h-100 d-flex align-items-center">
          <RxInfo />
        </div>
      </div>
    </div>
  );
};
export default UnicomGuardContainer;
