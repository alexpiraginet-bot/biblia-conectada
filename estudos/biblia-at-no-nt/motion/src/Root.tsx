import React from "react";
import {Composition} from "remotion";
import {Main} from "./Main";
import data from "./data.json";

// 1080x1920, 30 fps; the length comes from the narration timeline (tools/motion_data.py)
export const RemotionRoot: React.FC = () => (
  <Composition
    id="Main"
    component={Main}
    durationInFrames={Math.ceil(data.duration * data.fps)}
    fps={data.fps}
    width={1080}
    height={1920}
  />
);
