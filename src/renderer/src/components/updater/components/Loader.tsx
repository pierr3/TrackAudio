import './Loader.scss';

const Loader = () => {
  return (
    <div id="loader">
      <div className="razar">
        <div className="ringbase ring1"></div>
        <div className="ringbase ring2"></div>
        <div className="pulse"></div>
        <div className="pointer">
          <div></div>
        </div>
        <div className="dot pos1"></div>
        <div className="dot pos2"></div>
      </div>
    </div>
  );
};

export default Loader;
