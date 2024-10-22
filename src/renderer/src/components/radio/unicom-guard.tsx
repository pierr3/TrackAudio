import '../../style/UnicomGuard.scss';

const UnicomGuardBar = () => {
  return (
    <div className="unicom-bar-container">
      <span className="unicom-line-item">
        <span className="unicom-text">UNICOM (122.800)</span>
        <button className="btn btn-info sm-button">RX</button>
        <button className="btn btn-info sm-button">TX</button>
      </span>

      <span className="unicom-line-item">
        <span className="unicom-text">GUARD (121.500)</span>
        <button className="btn btn-info sm-button">RX</button>
        <button className="btn btn-info sm-button">TX</button>
      </span>
    </div>
  );
};

export default UnicomGuardBar;
