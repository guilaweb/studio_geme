import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WbsComponent } from './wbs-component';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';

// Mocks
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockOnSnapshot = onSnapshot as jest.Mock;
const mockAddDoc = addDoc as jest.Mock;

describe('WbsComponent', () => {
  const projectId = 'test-project-id';

  beforeEach(() => {
    mockOnSnapshot.mockClear();
    mockAddDoc.mockClear();
  });

  it('renders loading state initially', () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] }); // Empty initial state
      return () => {}; // Unsubscribe function
    });

    render(<WbsComponent projectId={projectId} />);
    expect(screen.getByText('Carregando EAP...')).toBeInTheDocument();
  });

  it('renders empty state when no WBS items exist', async () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] });
      return () => {};
    });

    render(<WbsComponent projectId={projectId} />);
    
    await waitFor(() => {
        expect(screen.getByText('Nenhuma fase ou atividade encontrada.')).toBeInTheDocument();
    });
    expect(screen.getByText('Crie a primeira fase para começar.')).toBeInTheDocument();
  });

  it('renders a list of root WBS items', async () => {
     const mockItems = [
      { id: '1', data: () => ({ id: '1', name: 'Fase 1: Fundações', parentId: null }) },
      { id: '2', data: () => ({ id: '2', name: 'Fase 2: Estrutura', parentId: null }) },
    ];
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: mockItems });
      return () => {};
    });

    render(<WbsComponent projectId={projectId} />);

    await waitFor(() => {
        expect(screen.getByText('Fase 1: Fundações')).toBeInTheDocument();
        expect(screen.getByText('Fase 2: Estrutura')).toBeInTheDocument();
    });
  });

  it('allows adding a new root phase', async () => {
    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({ docs: [] });
      return () => {};
    });
    mockAddDoc.mockResolvedValue({ id: 'new-id' });

    render(<WbsComponent projectId={projectId} />);
    
    await waitFor(() => {
        expect(screen.getByText('Nenhuma fase ou atividade encontrada.')).toBeInTheDocument();
    });
    
    fireEvent.change(screen.getByPlaceholderText('Ex: Fundações'), { target: { value: 'Nova Fase de Teste' } });
    fireEvent.click(screen.getByText('Adicionar Fase'));

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          name: 'Nova Fase de Teste',
          parentId: null,
          description: '',
          startDate: undefined,
          endDate: undefined,
          budget: 0,
          actualCost: 0,
        }
      );
    });
  });

});
