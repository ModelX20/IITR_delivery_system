import { EmptyState } from '../../components/EmptyState';
import { TruckIcon } from '../../components/icons';
import { useAuth } from '../../context/AuthContext';

// Placeholder until the delivery dashboard is built (Phase 4).
export function DeliveryHomePage() {
  const { user } = useAuth();
  return (
    <EmptyState
      icon={<TruckIcon />}
      title={`Welcome, ${user?.name.split(' ')[0] ?? 'partner'}`}
      message="The delivery dashboard is coming soon. You'll be able to accept orders, mark them delivered and see your earnings here."
    />
  );
}
