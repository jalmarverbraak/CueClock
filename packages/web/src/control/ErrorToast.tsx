interface Props {
  message: string | null;
  onDismiss: () => void;
}

export function ErrorToast({ message, onDismiss }: Props) {
  if (!message) return null;
  return (
    <div className="toast toast--error" role="alert">
      <span>{message}</span>
      <button className="toast__dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
