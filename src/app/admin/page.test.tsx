import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getDocs, collection } from 'firebase/firestore';
import AdminPage from './page';

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  getDocs: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  collectionGroup: jest.fn(),
  query: jest.fn(),
}));
jest.mock('@/components/Header', () => ({
  Header: () => <header>Mock Header</header>,
}));
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  })
) as jest.Mock;


const mockUseRouter = useRouter as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockGetDocs = getDocs as jest.Mock;

describe('AdminPage', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    mockUseRouter.mockReturnValue({ push: mockPush });
    mockPush.mockClear();
    mockGetDocs.mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  it('redirects non-admin users', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'user' }, loading: false, idToken: 'test-token' });
    render(<AdminPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });

  it('redirects unauthenticated users', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, idToken: null });
    render(<AdminPage />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows loading state initially', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, idToken: null });
    render(<AdminPage />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders admin panel for super-admin and fetches users', async () => {
    const mockUsers = [
      { id: '1', data: () => ({ uid: '1', displayName: 'Admin User', email: 'admin@test.com', plan: 'enterprise', role: 'super-admin' }) },
      { id: '2', data: () => ({ uid: '2', displayName: 'Regular User', email: 'user@test.com', plan: 'hobby', role: 'user' }) },
    ];
    // Mock multiple calls to getDocs
    mockGetDocs
      .mockResolvedValueOnce({ docs: mockUsers, size: 2 }) // For users
      .mockResolvedValueOnce({ docs: [], size: 5 }) // For posts
      .mockResolvedValueOnce({ docs: [], size: 10 }); // For comments/annotations

    mockUseAuth.mockReturnValue({ user: { uid: '1', role: 'super-admin' }, loading: false, idToken: 'test-token' });

    render(<AdminPage />);

    expect(screen.getByText('Dashboard Executivo')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
      expect(screen.getByText('Regular User')).toBeInTheDocument();
      expect(screen.getByText('user@test.com')).toBeInTheDocument();
    });
    
    expect(mockGetDocs).toHaveBeenCalled();
    
    const planSelects = await screen.findAllByRole('combobox');
    expect(planSelects.length).toBeGreaterThan(0);
  });
    
  it('does not render admin panel if user is not super-admin', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'user' }, loading: false, idToken: 'test-token' });
    render(<AdminPage />);
    expect(screen.queryByText('Dashboard Executivo')).not.toBeInTheDocument();
  });

  it('calls the update API when a plan is changed', async () => {
     const mockUsers = [
      { id: '1', data: () => ({ uid: '1', displayName: 'Admin User', email: 'admin@test.com', plan: 'enterprise', role: 'super-admin' }) },
      { id: '2', data: () => ({ uid: '2', displayName: 'Regular User', email: 'user@test.com', plan: 'hobby', role: 'user' }) },
    ];
    mockGetDocs.mockResolvedValue({ docs: mockUsers });
    mockUseAuth.mockReturnValue({ user: { uid: '1', role: 'super-admin' }, loading: false, idToken: 'test-token' });

    render(<AdminPage />);

    await screen.findByText('Regular User');
    
    const userPlanSelect = screen.getByDisplayValue('hobby');
    fireEvent.change(userPlanSelect, { target: { value: 'pro' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ userId: '2', field: 'plan', value: 'pro' }),
      });
    });
  });
});
