import SceneComponent from "./components/babylonjs-hook";
import "@babylonjs/loaders";
import {
  Scene,
  ArcRotateCamera,
  CubeTexture,
  FilesInput,
  Engine,
  SceneLoader,
  CreatePlane,
  Texture,
  PBRMaterial,
} from "@babylonjs/core";
import {
  useDropzone,
  type FileRejection,
  type DropEvent,
} from "react-dropzone";
import { useCallback, useState } from "react";
import { EnvironmentTools } from "./lib/env-tools";
import { Inspector } from "@babylonjs/inspector";

export const App = () => {
  const [files, setFiles] = useState<DropEvent>();

  const onDrop = useCallback(
    (files: File[], fileRejection: FileRejection[], e: DropEvent) => {
      console.log(e);
      setFiles(e);
    },
    [],
  );

  const handleOnChange = (e: Event) => {
    setFiles(e);
  };

  function isTextureAsset(name: string): boolean {
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
  }

  const { getRootProps, getInputProps } = useDropzone({
    noDragEventsBubbling: true,
    onDrop,
    //accept: {
    //  "model/gltf-binary": [".glb"],
    //  "model/obj": [".obj"],
    //},
    multiple: true,
  });

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
        // this.props.globalState.onError.notifyObservers({ scene: scene, message: message || exception.message || "Failed to load texture" });
      },
    );

    const material = new PBRMaterial("unlit", scene);
    material.unlit = true;
    material.albedoTexture = texture;
    material.alphaMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
    plane.material = material;

    return scene;
  };

  const onSceneReady = async (scene: Scene, engine: Engine) => {
    scene.environmentTexture = new CubeTexture("/environment.env", scene);

    // this creates and positions a free camera (non-mesh)
    // load 3d model from file
    //const url = URL.createObjectURL(file);
    //const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const filesInput = new FilesInput(
      engine,
      null,
      (sceneFile: File, scene: Scene) => {
        scene.createDefaultCameraOrLight(true, true, true);
        const camera = scene.activeCamera as ArcRotateCamera;

        // This targets the camera to scene origin
        camera.alpha += Math.PI;

        // This attaches the camera to the canvas
        camera.attachControl(true);
        Inspector.Show(scene, {});
      },
      null,
      null,
      null,
      () => {},
      null,
      (file, scene, message) => {},
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

    filesInput.loadFiles(files);

    //await appendSceneAsync(url, scene, {
    //  pluginExtension: `.${fileExtension ?? "glb"}`,
    //  name: file.name,
    //});
  };

  return (
    <div className="h-[100dvh] p-4">
      <SceneComponent
        className="w-full h-full rounded-xl overflow-hidden"
        antialias
        onSceneReady={onSceneReady}
        // onRender={onRender}
        id="my-canvas"
      />
    </div>
  );
};

export default App;
