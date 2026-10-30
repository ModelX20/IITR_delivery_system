import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

export function NotFoundPage() {
  return (
    <EmptyState
      emoji="🧭"
      title="Page not found"
      message="Looks like this page took a wrong turn. Let's get you back."
      action={
        <Link to="/" className="btn-primary">
          Go home
        </Link>
      }
    />
  );
}
