import { EnvironmentTools } from "../lib/env-tools";
import {
  ArcRotateCamera,
  CreatePlane,
  CubeTexture,
  Engine,
  FilesInput,
  PBRMaterial,
  Scene,
  SceneLoader,
  Texture,
} from "@babylonjs/core";
import "@babylonjs/loaders";
import { ElementRef, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BugIcon } from "lucide-react";
import { Inspector } from "@babylonjs/inspector";

const isTextureAsset = (name: string): boolean => {
  const queryStringIndex = name.indexOf("?");
  if (queryStringIndex !== -1) {
    name = name.substring(0, queryStringIndex);
  }

  return (
    name.endsWith(".ktx") ||
    name.endsWith(".ktx2") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  );
};

type ViewModelScene = {
  className?: string;
};

export const ViewModelScene = ({ className }: ViewModelScene) => {
  const canvasRef = useRef<ElementRef<"canvas"> | null>(null);
  const [engine, setEngine] = useState<Engine>();
  const [scene, setScene] = useState<Scene>();
  const [hasFiles, setHasFiles] = useState<boolean>();
  const [toggleInspector, setToggleInspector] = useState<boolean>(false);

  const handleToggleInspector = () => {
    if (!scene) return;

    if (!toggleInspector) {
      Inspector.Show(scene, {});
      setToggleInspector(true);
      return;
    }

    Inspector.Hide();
    setToggleInspector(false);
  };

  const loadTextureAsset = (url: string, engine: Engine): Scene => {
    const scene = new Scene(engine);
    const plane = CreatePlane("plane", { size: 1 }, scene);

    const texture = new Texture(
      url,
      scene,
      undefined,
      undefined,
      Texture.NEAREST_LINEAR,
      () => {
        const size = texture.getBaseSize();
        if (size.width > size.height) {
          plane.scaling.y = size.height / size.width;
        } else {
          plane.scaling.x = size.width / size.height;
        }

        texture.gammaSpace = true;
        texture.hasAlpha = true;
        texture.wrapU = Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = Texture.CLAMP_ADDRESSMODE;

        scene.debugLayer.show();
        scene.debugLayer.select(texture, "PREVIEW");
      },
      (message, exception) => {
        toast.error(message || exception.message || "Failed to load texture");
      },
    );

    const material = new PBRMaterial("unlit", scene);
    material.unlit = true;
    material.albedoTexture = texture;
    material.alphaMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
    plane.material = material;

    return scene;
  };

  // initialize the scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const _engine = new Engine(canvasRef.current, true);

    const _scene = new Scene(_engine);

    const resize = () => {
      _scene.getEngine().resize();
    };

    if (window) {
      window.addEventListener("resize", resize);
    }

    setEngine(_engine);
    setScene(_scene);

    return () => {
      if (window) {
        window.removeEventListener("resize", resize);
      }

      _scene.getEngine().dispose();
    };
  }, []);

  useEffect(() => {
    if (!scene || !engine || !canvasRef.current) return;

    const filesInput = new FilesInput(
      engine,
      null,
      (_fileName: File, localScene: Scene) => {
        setHasFiles(true);
        localScene.environmentTexture = new CubeTexture(
          "/environment.env",
          scene,
        );
        localScene.createDefaultCameraOrLight(true, true, true);
        const camera = localScene.activeCamera as ArcRotateCamera;

        // This targets the camera to scene origin
        camera.alpha += Math.PI;

        // This attaches the camera to the canvas
        camera.attachControl(true);

        engine.runRenderLoop(() => {
          localScene.render();
        });

        setScene(localScene);
        toast.success("Load model success");
      },
      null,
      null,
      null,
      () => {},
      null,
      (_file, _scene, message) => {
        toast.error(message || "Something Went Wrong");
      },
    );

    filesInput.onProcessFileCallback = (
      file,
      name,
      extension,
      setSceneFileToLoad,
    ) => {
      if (
        filesInput.filesToLoad &&
        filesInput.filesToLoad.length === 1 &&
        extension
      ) {
        switch (extension.toLowerCase()) {
          case "dds":
          case "env":
          case "hdr": {
            FilesInput.FilesToLoad[name] = file;
            EnvironmentTools.SkyboxPath = "file:" + (file as any).correctName;
            EnvironmentTools.ResetEnvironmentTexture();
            return false;
          }
          default: {
            if (isTextureAsset(name)) {
              setSceneFileToLoad(file);
            }

            break;
          }
        }
      }

      return true;
    };

    filesInput.loadAsync = (sceneFile, onProgress) => {
      const filesToLoad = filesInput.filesToLoad;
      if (filesToLoad.length === 1) {
        const fileName = (filesToLoad[0] as any).correctName;
        if (isTextureAsset(fileName)) {
          return Promise.resolve(loadTextureAsset(`file:${fileName}`, engine));
        }
      }

      engine.clearInternalTexturesCache();

      return SceneLoader.LoadAsync("file:", sceneFile, engine, onProgress);
    };

    filesInput.monitorElementForDragNDrop(canvasRef.current!);

    return () => {
      filesInput.dispose();
    };
  }, [scene, engine]);

  return (
    <div className="w-full h-full rounded-xl relative bg-muted-foreground">
      <canvas id="renderCanvas" ref={canvasRef} className="w-full h-full" />
      {!hasFiles && (
        <span className="absolute text-md font-semibold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 backdrop-blur-[25px] rounded-2xl  bg-muted px-4 py-2">
          Drag and drop gltf, glb, obj, or babylon files to view them
        </span>
      )}
      {hasFiles && (
        <div className="rounded-md bg-muted p-2 absolute bottom-2 left-1/2 -translate-x-1/2">
          <button
            className="outline-none size-6 grid place-items-center hover:bg-muted-foreground group rounded-sm transition-colors"
            onClick={handleToggleInspector}
          >
            <BugIcon className="size-[18px] text-foreground" />
          </button>
        </div>
      )}
    </div>
  );
};
