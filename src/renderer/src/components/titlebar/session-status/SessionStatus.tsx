import './ConnectStatus.scss';
import ConnectionStatus from './ConnectionStatus';
const SessionStatus = () => {
  return (
    <>
      <div className="d-flex flex-row align-items-center h-100 connect-status">
        <div className="d-flex flex-row toolbar-item">
          <ConnectionStatus />
        </div>
      </div>
    </>
  );
};

export default SessionStatus;
