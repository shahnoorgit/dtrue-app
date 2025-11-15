import React, { createContext, useContext, useState, ReactNode } from 'react';
import ErrorModal from '@/components/ui/ErrorModal';

interface ErrorState {
  visible: boolean;
  title: string;
  message: string;
  type: 'error' | 'success' | 'warning' | 'info';
  showRetry: boolean;
  onRetry?: () => void;
}

interface ErrorContextType {
  showError: (title: string, message: string, options?: {
    type?: 'error' | 'success' | 'warning' | 'info';
    showRetry?: boolean;
    onRetry?: () => void;
  }) => void;
  hideError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errorState, setErrorState] = useState<ErrorState>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    showRetry: false,
  });

  const showError = (
    title: string,
    message: string,
    options: {
      type?: 'error' | 'success' | 'warning' | 'info';
      showRetry?: boolean;
      onRetry?: () => void;
    } = {}
  ) => {
    setErrorState({
      visible: true,
      title,
      message,
      type: options.type || 'error',
      showRetry: options.showRetry || false,
      onRetry: options.onRetry,
    });
  };

  const hideError = () => {
    setErrorState(prev => ({
      ...prev,
      visible: false,
    }));
  };

  const handleRetry = () => {
    if (errorState.onRetry) {
      errorState.onRetry();
    }
  };

  return (
    <ErrorContext.Provider value={{ showError, hideError }}>
      {children}
      <ErrorModal
        visible={errorState.visible}
        title={errorState.title}
        message={errorState.message}
        type={errorState.type}
        onClose={hideError}
        onRetry={handleRetry}
        showRetry={errorState.showRetry}
      />
    </ErrorContext.Provider>
  );
};
