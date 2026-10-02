'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Viewer, XKTLoaderPlugin, Marker, SectionPlane, Mesh, VBOGeometry, PhongMaterial, EdgeMaterial, CubeTexture } from '@xeokit/xeokit-sdk';
import type { Scene, MetaModel, MetaObject } from '@xeokit/xeokit-sdk';
import { cn } from '@/lib/utils';
import type { TopoPoint } from '@/types/topography';
import { Delaunay } from 'd3-delaunay';

interface Annotation {
    id: string;
    coords: { x: number; y: number; z: number; };
    status: 'Aberta' | 'Resolvida';
}

interface Axis {
    id: string;
    name: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}


interface BimEntity {
    id: string;
    name: string;
    type: string;
    properties: Record<string, any>;
}

interface BimViewerProps {
  modelUrl?: string;
  metaModelUrl?: string;
  
  dtmPoints?: TopoPoint[];
  axisToDisplay?: Axis | null;

  annotations?: Annotation[];
  selectedAnnotationId?: string | null;
  visibleEntityTypes?: string[];
  sectionPlanes?: SectionPlane[];
  onModelClick?: (coords: { x: number; y: number; z: number }) => void;
  onMarkerClick?: (annotationId: string) => void;
  onEntityClick?: (entity: BimEntity) => void;
  onMetaModelLoad?: (types: string[]) => void;
}

const BimViewer = ({ 
    modelUrl, 
    metaModelUrl,
    dtmPoints,
    axisToDisplay,
    annotations, 
    selectedAnnotationId, 
    visibleEntityTypes,
    sectionPlanes,
    onModelClick, 
    onMarkerClick, 
    onEntityClick, 
    onMetaModelLoad,
}: BimViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const annotationMarkersRef = useRef<Record<string, Marker>>({});
  const topoPointMarkersRef = useRef<Marker[]>([]);
  const axisMeshRef = useRef<Mesh | null>(null);
  const metaModelRef = useRef<MetaModel | null>(null);
  const sectionPlanesRef = useRef<SectionPlane[]>([]);

  // Store callbacks in refs to avoid re-triggering the main effect
  const onModelClickRef = useRef(onModelClick);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onEntityClickRef = useRef(onEntityClick);
  const onMetaModelLoadRef = useRef(onMetaModelLoad);

  useEffect(() => {
    onModelClickRef.current = onModelClick;
    onMarkerClickRef.current = onMarkerClick;
    onEntityClickRef.current = onEntityClick;
    onMetaModelLoadRef.current = onMetaModelLoad;
  }, [onModelClick, onMarkerClick, onEntityClick, onMetaModelLoad]);

  const delaunayTriangles = useMemo(() => {
    if (!dtmPoints || dtmPoints.length < 3) return null;

    const delaunay = Delaunay.from(dtmPoints, p => p.east, p => p.north);
    const vertices: number[] = [];
    const indices: number[] = [];
    
    // Use a map to ensure each unique vertex is added only once
    const pointMap = new Map<string, number>();
    let indexCounter = 0;

    for (let i = 0; i < delaunay.triangles.length; i++) {
        const pointIndex = delaunay.triangles[i];
        const p = dtmPoints[pointIndex];
        const pointKey = `${p.east},${p.north}`;
        
        if (!pointMap.has(pointKey)) {
            pointMap.set(pointKey, indexCounter);
            vertices.push(p.east, p.elevation, -p.north); // Note: Y and Z are swapped for correct 3D orientation
            indices.push(indexCounter);
            indexCounter++;
        } else {
            indices.push(pointMap.get(pointKey)!);
        }
    }
    
    return { vertices, indices };
  }, [dtmPoints]);


  // Effect for initializing the viewer and loading the model
  useEffect(() => {
    if (!canvasRef.current) return;

    let hasContent = !!modelUrl || (dtmPoints && dtmPoints.length >= 3);
    if (!hasContent) {
         if(viewerRef.current) {
            viewerRef.current.destroy();
            viewerRef.current = null;
        }
        return;
    }
    
    let viewer: Viewer | null = new Viewer({
      canvasId: canvasRef.current.id,
      transparent: true,
    });
    viewerRef.current = viewer;
    
    viewer.camera.eye = [-3.933, 2.855, -27.399];
    viewer.camera.look = [4.400, 3.724, 8.899];
    viewer.camera.up = [0.014, 0.999, 0.039];
    
    if (modelUrl && metaModelUrl) {
      const xktLoader = new XKTLoaderPlugin(viewer);

      const model = xktLoader.load({
        id: 'bim-model',
        src: modelUrl,
        metaModelSrc: metaModelUrl,
        edges: true,
      });
      
      model.on('loaded', () => {
        if ((viewerRef.current?.scene as any)?.xrayPicker) {
            (viewerRef.current!.scene as any).xrayPicker.enabled = true;
        }
        viewerRef.current?.cameraFlight.flyTo(model);
      });

      (model as any).on('metaModelLoaded', (metaModel: MetaModel) => {
        metaModelRef.current = metaModel;
        const types = Object.values((metaModel as any).metaObjects || {}).reduce((acc: Set<string>, metaObject: any) => {
          if (metaObject.type) {
            acc.add(metaObject.type);
          }
          return acc;
        }, new Set<string>());
        onMetaModelLoadRef.current?.(Array.from(types).sort());
      });
    } else if (delaunayTriangles) {
       const dtmMesh = new Mesh(viewer.scene, {
            geometry: new VBOGeometry(viewer.scene, {
                primitive: "triangles",
                positions: delaunayTriangles.vertices,
                indices: delaunayTriangles.indices,
            }),
            material: new PhongMaterial(viewer.scene, {
                diffuse: [0.6, 0.6, 0.4],
                specular: [0.5, 0.5, 0.3],
                ambient: [0.3, 0.3, 0.2],
                shininess: 50,
                backfaces: true,
            }),
            edges: true,
            edgeMaterial: new EdgeMaterial(viewer.scene, {
                edgeColor: [0.2, 0.2, 0.2],
                edgeWidth: 2
            }) as any
        });
        dtmMesh.on('loaded', () => {
             if ((viewerRef.current?.scene as any)?.xrayPicker) {
                (viewerRef.current!.scene as any).xrayPicker.enabled = true;
             }
             viewerRef.current?.cameraFlight.flyTo(dtmMesh);
        });
    }

    const scene = viewer.scene;
    const input = scene.input;

    const handlePick = (coords: number[]) => {
      const currentViewer = viewerRef.current;
      if (!currentViewer) return;

      const pickResult = currentViewer.scene.pick({
        canvasPos: coords,
        pickSurface: true,
      });

      if ((pickResult as any)?.marker && onMarkerClickRef.current) {
        onMarkerClickRef.current((pickResult as any).marker.id);
        return;
      }
      
      if (pickResult?.entity && metaModelRef.current && onEntityClickRef.current) {
        const metaObject = (metaModelRef.current as any).metaObjects?.[pickResult.entity.id];
        if (metaObject) {
          onEntityClickRef.current({
            id: metaObject.id,
            name: metaObject.name,
            type: metaObject.type,
            properties: metaObject.properties,
          });
        }
      } else if (pickResult?.worldPos && onModelClickRef.current) {
        onModelClickRef.current({
          x: pickResult.worldPos[0],
          y: pickResult.worldPos[1],
          z: pickResult.worldPos[2],
        });
      }
    };
    
    input.on('mouseclicked', handlePick);
    
    // Cleanup on unmount
    return () => {
      if (viewer) {
        viewer.destroy();
        viewer = null;
      }
      viewerRef.current = null;
      metaModelRef.current = null;
      annotationMarkersRef.current = {};
      topoPointMarkersRef.current = [];
    };
  }, [modelUrl, metaModelUrl, delaunayTriangles]);

  // Effect for managing markers (for annotations)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !annotations) return;

    const existingMarkerIds = Object.keys(annotationMarkersRef.current);
    const incomingAnnotationIds = new Set(annotations.map(a => a.id));

    // Remove markers that are no longer in the annotations list
    existingMarkerIds.forEach(markerId => {
      if (!incomingAnnotationIds.has(markerId)) {
        if(annotationMarkersRef.current[markerId]) {
            annotationMarkersRef.current[markerId].destroy();
        }
        delete annotationMarkersRef.current[markerId];
      }
    });

    annotations.forEach(annotation => {
      if (!viewerRef.current || !annotation.coords) return; 

      if (!annotationMarkersRef.current[annotation.id]) {
        const marker = new Marker(viewer.scene, {
            id: annotation.id,
            worldPos: [annotation.coords.x, annotation.coords.y, annotation.coords.z],
            occludable: true,
            element: document.createElement('div'),
        } as any);
        
        const markerElement = (marker as any).element as HTMLDivElement;
        markerElement.addEventListener('click', (e) => {
            e.stopPropagation();
            onMarkerClickRef.current?.(annotation.id);
        });
        annotationMarkersRef.current[annotation.id] = marker;
      }
      
      const marker = annotationMarkersRef.current[annotation.id];
      const element = (marker as any).element as HTMLDivElement;
      element.className = cn(
        'rounded-full w-4 h-4 border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-all',
        {
          'bg-destructive': annotation.status === 'Aberta',
          'bg-green-500': annotation.status === 'Resolvida',
          'ring-2 ring-offset-2 ring-blue-500 scale-125': selectedAnnotationId === annotation.id,
        }
      );
    });

  }, [annotations, selectedAnnotationId]);
  
  // Effect for managing topo point markers
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !dtmPoints) return;

    // Destroy old markers
    topoPointMarkersRef.current.forEach(marker => marker.destroy());
    topoPointMarkersRef.current = [];

    // Create new markers
    dtmPoints.forEach(point => {
        const newMarker = new Marker(viewer.scene, {
            worldPos: [point.east, point.elevation, -point.north],
            element: createPointMarkerElement(point.code),
        } as any);
        topoPointMarkersRef.current.push(newMarker);
    });

  }, [dtmPoints]);


  // Effect for managing object visibility (for BIM models)
  useEffect(() => {
      const viewer = viewerRef.current;
      const metaModel = metaModelRef.current;
      
      if (!viewer || !metaModel || !visibleEntityTypes) return;

      const allObjectIds = Object.keys((metaModel as any).metaObjects || {});

      // If visibleEntityTypes is not yet populated, show all
      if (visibleEntityTypes.length === 0 && allObjectIds.length > 0) {
        viewer.scene.setObjectsVisible(allObjectIds, true);
        return;
      }

      const visibleObjectIds: string[] = [];
      const invisibleObjectIds: string[] = [];
      
      allObjectIds.forEach(objectId => {
        const type = (metaModel as any).metaObjects?.[objectId]?.type;
        if (type && visibleEntityTypes.includes(type)) {
            visibleObjectIds.push(objectId);
        } else {
            invisibleObjectIds.push(objectId);
        }
      });
      
      viewer.scene.setObjectsVisible(visibleObjectIds, true);
      viewer.scene.setObjectsVisible(invisibleObjectIds, false);
      
  }, [visibleEntityTypes]);

  // Effect to fly to annotation
   useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedAnnotationId || !annotations) return;

    const annotation = annotations.find(a => a.id === selectedAnnotationId);
    if (annotation && annotation.coords) {
        viewer.cameraFlight.flyTo({
            look: [annotation.coords.x, annotation.coords.y, annotation.coords.z],
            duration: 1.5,
        });
    }
  }, [selectedAnnotationId, annotations]);
  
   // Effect to manage section planes from props
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Destroy all existing planes
    sectionPlanesRef.current.forEach(p => p.destroy());
    sectionPlanesRef.current = [];
    
    // Add new planes from props
    if (sectionPlanes) {
        sectionPlanes.forEach(planeData => {
            const plane = new SectionPlane(viewer.scene, planeData);
            sectionPlanesRef.current.push(plane);
        });
    }
  }, [sectionPlanes]);
  
  // Effect to manage the displayed axis
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Destroy the previous axis mesh if it exists
    if (axisMeshRef.current) {
        axisMeshRef.current.destroy();
        axisMeshRef.current = null;
    }

    if (axisToDisplay && dtmPoints && dtmPoints.length > 0) {
        const { startX, startY, endX, endY } = axisToDisplay;
        
        // Find average elevation of the terrain to place the axis
        const avgElevation = dtmPoints.reduce((acc, p) => acc + p.elevation, 0) / dtmPoints.length;
        const axisElevation = avgElevation + 2; // Place it slightly above the terrain

        axisMeshRef.current = new Mesh(viewer.scene, {
            geometry: new VBOGeometry(viewer.scene, {
                primitive: 'lines',
                positions: [startX, axisElevation, -startY, endX, axisElevation, -endY],
                indices: [0, 1]
            }),
            material: new PhongMaterial(viewer.scene, {
                emissive: [1, 0, 0], // Red color
                lineWidth: 5,
            }),
        });
    }

  }, [axisToDisplay, dtmPoints]);
  
  // Helper to create the visual element for a topo point marker
  const createPointMarkerElement = (code: string) => {
    const div = document.createElement('div');
    div.className = 'flex flex-col items-center justify-center pointer-events-none';
    div.innerHTML = `
        <div class="bg-red-500 w-2 h-2 rounded-full border border-white"></div>
        <div class="text-xs text-red-500 bg-white/50 backdrop-blur-sm px-1 rounded -mt-1">${code}</div>
    `;
    return div;
  };
  
    if (!modelUrl && (!dtmPoints || dtmPoints.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-16 w-16 mb-4 text-muted-foreground"
                >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <path d="m3.3 7 8.7 5 8.7-5"/>
                    <path d="M12 22V12"/>
                </svg>
                <h3 className="font-semibold text-lg">Nenhum Modelo 3D Carregado</h3>
                <p className="text-sm mt-1">
                    Para usar o visualizador, vá a 'Engenharia' {'->'} 'Documentos' e carregue um ficheiro de modelo (.ifc ou .xkt) e depois selecione-o nas Definições do Projeto.
                </p>
                 <p className="text-sm mt-2">
                    Ou, adicione pontos topográficos em 'Engenharia' {'->'} 'Topografia' para visualizar o Modelo Digital do Terreno.
                </p>
            </div>
        );
    }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas id="bim-canvas" ref={canvasRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}></canvas>
    </div>
  );
};

export default BimViewer;
