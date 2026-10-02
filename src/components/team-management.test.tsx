import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamManagement } from './team-management';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { onSnapshot, getDocs } from 'firebase/firestore';

// Mocks
jest.mock('@/hooks/use-auth');
jest.mock('firebase/firestore');
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockOnSnapshot = onSnapshot as jest.Mock;
const mockGetDocs = getDocs as jest.Mock;

describe('TeamManagement', () => {
  const projectId = 'test-project';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ idToken: 'test-token' });
  });

  it('renders loading state initially', () => {
    mockOnSnapshot.mockImplementation(() => () => {}); // Mock unsubscribe
    render(<TeamManagement projectId={projectId} />);
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    // Check for loading indicator in the member list
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('displays current team members after loading', async () => {
    const mockMembers = [
      { id: 'uid1', data: () => ({ uid: 'uid1', displayName: 'John Doe', email: 'john@test.com', role: 'Gestor' }) },
    ];
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockMembers });
      return () => {};
    });

    render(<TeamManagement projectId={projectId} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
      expect(screen.getByText('Gestor')).toBeInTheDocument();
    });
  });

  it('searches for users and displays results', async () => {
    mockOnSnapshot.mockImplementation((q, cb) => {
        cb({ docs: [] }); // No initial members
        return () => {};
    });
    const mockUsers = [
      { data: () => ({ uid: 'uid2', displayName: 'Jane Smith', email: 'jane@test.com' }) },
    ];
    mockGetDocs.mockResolvedValue({ docs: mockUsers });

    render(<TeamManagement projectId={projectId} />);
    
    const searchInput = screen.getByPlaceholderText('Pesquisar por e-mail');
    const searchButton = screen.getByRole('button', { name: /search/i });

    fireEvent.change(searchInput, { target: { value: 'jane@test.com' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('allows selecting a user from search results and adding them', async () => {
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
        })
    ) as jest.Mock;

    mockOnSnapshot.mockImplementation((q, cb) => {
        cb({ docs: [] });
        return () => {};
    });
    const mockUsers = [
      { data: () => ({ uid: 'uid2', displayName: 'Jane Smith', email: 'jane@test.com' }) },
    ];
    mockGetDocs.mockResolvedValue({ docs: mockUsers });
    
    render(<TeamManagement projectId={projectId} />);
    
    // Search
    fireEvent.change(screen.getByPlaceholderText('Pesquisar por e-mail'), { target: { value: 'jane' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    // Select
    await waitFor(() => {
        fireEvent.click(screen.getByText('Jane Smith'));
    });

    // Add
    const addButton = screen.getByRole('button', { name: /adicionar utilizador/i });
    fireEvent.click(addButton);

    await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
            `/api/projects/${projectId}/team`,
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    uid: 'uid2',
                    email: 'jane@test.com',
                    displayName: 'Jane Smith',
                    role: 'Leitor',
                }),
            })
        );
    });
  });
});

// Add a loader with test-id for the first test case to pass
jest.mock('lucide-react', () => {
    const original = jest.requireActual('lucide-react');
    return {
        ...original,
        Loader2: (props: any) => <div {...props} data-testid="loader" />,
    };
});
