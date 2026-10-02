import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';

type WorkflowState = {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNode: (node: Node | null) => void;
  updateNodeConfig: (nodeId: string, data: any) => void;
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  setNodes: (nodes: Node[]) => {
    set({ nodes });
  },

  setEdges: (edges: Edge[]) => {
    set({ edges });
  },

  setSelectedNode: (node: Node | null) => {
    set({ selectedNode: node });
    // Also update the 'selected' property on the nodes themselves for visual feedback
    set({
        nodes: get().nodes.map(n => ({
            ...n,
            selected: node ? n.id === node.id : false,
        }))
    })
  },

  updateNodeConfig: (nodeId: string, data: any) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          node.data = { ...node.data, ...data };
        }
        return node;
      }),
    });
    // Also update the selected node if it's the one being changed
    const selected = get().selectedNode;
    if (selected && selected.id === nodeId) {
        set({
            selectedNode: {
                ...selected,
                data: { ...selected.data, ...data },
            },
        });
    }
  },
}));
