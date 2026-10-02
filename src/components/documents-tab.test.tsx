import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentsTab } from './documents-tab';
import { db, storage } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/hooks/use-auth';

// Mocks
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}));

jest.mock('firebase/storage', () => ({
  ...jest.requireActual('firebase/storage'),
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock('@/hooks/use-auth');
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const mockOnSnapshot = onSnapshot as jest.Mock;
const mockAddDoc = addDoc as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUploadBytesResumable = uploadBytesResumable as jest.Mock;
const mockGetDownloadURL = getDownloadURL as jest.Mock;


describe('DocumentsTab', () => {
  const projectId = 'test-docs-project';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { uid: 'test-user', displayName: 'Test User' } });
  });

  it('renders loading state initially', () => {
    mockOnSnapshot.mockImplementation((q, callback) => {
      // Don't resolve immediately
      return () => {};
    });
    render(<DocumentsTab projectId={projectId} userRole='Gestor' />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders empty state when no documents or folders exist', async () => {
    mockOnSnapshot.mockImplementation((q, callback) => {
      callback({ docs: [] });
      return () => {};
    });

    render(<DocumentsTab projectId={projectId} userRole='Gestor' />);

    await waitFor(() => {
      expect(screen.getByText('Esta pasta está vazia.')).toBeInTheDocument();
    });
  });

  it('allows creating a new folder', async () => {
    mockOnSnapshot.mockImplementation((q, cb) => { cb({ docs: [] }); return () => {}; });
    mockAddDoc.mockResolvedValue({ id: 'new-folder' });

    render(<DocumentsTab projectId={projectId} userRole='Gestor' />);

    await waitFor(() => {
      expect(screen.getByText('Esta pasta está vazia.')).toBeInTheDocument();
    });
    
    fireEvent.change(screen.getByPlaceholderText('Nome da nova pasta'), { target: { value: 'Planos de Arquitetura' } });
    fireEvent.click(screen.getByText('Criar Pasta'));

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Planos de Arquitetura',
          type: 'folder',
          parentId: null,
        })
      );
    });
  });

  it('allows uploading a file', async () => {
    mockOnSnapshot.mockImplementation((q, cb) => { cb({ docs: [] }); return () => {}; });
    mockUploadBytesResumable.mockResolvedValue({ ref: 'mock-ref' });
    mockGetDownloadURL.mockResolvedValue('http://fake-url.com/file.pdf');
    mockAddDoc.mockResolvedValue({ id: 'new-file' });

    render(<DocumentsTab projectId={projectId} userRole='Gestor' />);

    const file = new File(['dummy content'], 'planta.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText('Carregar Ficheiros').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
       fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(mockUploadBytesResumable).toHaveBeenCalled();
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'planta.pdf',
          type: 'file',
          size: file.size,
          url: 'http://fake-url.com/file.pdf',
        })
      );
    });
  });
});
