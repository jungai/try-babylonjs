import SceneComponent from "./components/babylonjs-hook";
import "@babylonjs/loaders";
import {
  Scene,
  appendSceneAsync,
  ArcRotateCamera,
  CubeTexture,
} from "@babylonjs/core";
import { useDropzone } from "react-dropzone";
import { useCallback, useState } from "react";

export const App = () => {
  const [file, setFile] = useState<File>();

  const onDrop = useCallback((files: File[]) => {
    if (files.length <= 0) return;

    setFile(files[0]);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "model/gltf-binary": [".glb"],
      "model/obj": [".obj"],
    },
    multiple: false,
  });

  const onSceneReady = async (scene: Scene) => {
    if (!file) return;

    scene.environmentTexture = new CubeTexture("/environment.env", scene);

    // this creates and positions a free camera (non-mesh)
    // load 3d model from file
    const url = URL.createObjectURL(file);
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    await appendSceneAsync(url, scene, {
      pluginExtension: `.${fileExtension ?? "glb"}`,
      name: file.name,
    });

    scene.createDefaultCameraOrLight(true, true, true);
    const camera = scene.activeCamera as ArcRotateCamera;

    // This targets the camera to scene origin
    camera.alpha += Math.PI;

    // This attaches the camera to the canvas
    camera.attachControl(true);
  };

  return (
    <div className="h-[100dvh] p-4">
      {file ? (
        <SceneComponent
          className="w-full h-full rounded-xl overflow-hidden"
          antialias
          onSceneReady={onSceneReady}
          // onRender={onRender}
          id="my-canvas"
        />
      ) : (
        <div className="w-full h-full rounded-xl bg-muted" {...getRootProps()}>
          <input {...getInputProps()} />
          <p className="text-sm absolute bottom-6 left-1/2 -translate-x-1/2">
            Drag & drop a 3D model here, or click to select file (Supported
            formats: .glb, .obj)
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
