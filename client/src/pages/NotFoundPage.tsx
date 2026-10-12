import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { SearchIcon } from '../components/icons';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<SearchIcon />}
      title="Page not found"
      message="The page you're looking for doesn't exist."
      action={
        <Link to="/" className="btn-primary">
          Go to shop
        </Link>
      }
    />
  );
}
