interface UpdateErrorProps {
  title: string;
  message: string;
}

const UpdateError = ({ title, message }: UpdateErrorProps) => {
  return (
    <div className="list-group-item list-group-item-updating list-group-item-action global-text">
      <div className="d-flex w-100 flex-column justify-content-between align-items-center">
        <div className="name-text d-flex flex-column align-items-center gap-2  w-100">
          <div className="d-flex flex-column align-items-center">
            <div> {title}</div>

            <small className="createdat-text">{message}</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateError;
