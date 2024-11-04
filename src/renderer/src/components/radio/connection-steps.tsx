import React from 'react';
import { CheckCircleFill, Gear, Link45deg, Icon, Wifi } from 'react-bootstrap-icons';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: Icon;
  isCompleted: boolean;
}

interface ConnectionStepsProps {
  isNetworkConnected: boolean;
  isConnected: boolean;
}

const ConnectionSteps: React.FC<ConnectionStepsProps> = ({ isNetworkConnected, isConnected }) => {
  const steps: Step[] = [
    {
      id: 1,
      title: 'Network Connection',
      description: 'Check your network connectivity',
      icon: Wifi,
      isCompleted: isNetworkConnected
    },
    {
      id: 2,
      title: 'Ready to Connect',
      description: 'System is ready for connection',
      icon: Gear,
      isCompleted: isNetworkConnected && !isConnected
    },
    {
      id: 3,
      title: 'Connect to Simulator',
      description: 'Establish simulator connection',
      icon: Link45deg,
      isCompleted: isConnected
    }
  ];

  return (
    <div className="container py-4">
      <div className="d-flex flex-column gap-4">
        {steps.map((step, index) => (
          <div key={step.id} className="position-relative">
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`position-absolute start-20px top-40px h-100 border-start ${
                  steps[index + 1].isCompleted ? 'border-success' : 'border-secondary'
                }`}
                style={{ left: '20px', width: '2px' }}
              />
            )}

            {/* Step Item */}
            <div className="d-flex align-items-start gap-3">
              {/* Icon Circle */}
              <div
                className={`rounded-circle p-2 d-flex align-items-center justify-content-center ${
                  step.isCompleted ? 'bg-success' : 'bg-secondary'
                }`}
                style={{ width: '40px', height: '40px' }}
              >
                {step.isCompleted ? (
                  <CheckCircleFill className="text-white" size={20} />
                ) : (
                  <step.icon className="text-white" size={20} />
                )}
              </div>

              {/* Content */}
              <div>
                <h5 className={`mb-1 ${step.isCompleted ? 'text-success' : 'text-dark'}`}>
                  {step.title}
                </h5>
                <p className="text-secondary mb-0 small">{step.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConnectionSteps;
