import { Composition } from 'remotion';
import { AIFL_TOTAL } from './aifl/Main';
import { ThemedFilm } from './themes/ThemedFilm';
import { VerticalFilm, VERTICAL_W, VERTICAL_H } from './vertical/VerticalFilm';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="AiflPromo"
        component={ThemedFilm}
        defaultProps={{theme: 'ink-press'}}
        durationInFrames={AIFL_TOTAL}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* 9:16 cut for TikTok / Instagram Reels / YouTube Shorts */}
      <Composition
        id="AiflPromoVertical"
        component={VerticalFilm}
        defaultProps={{theme: 'ink-press'}}
        durationInFrames={AIFL_TOTAL}
        fps={30}
        width={VERTICAL_W}
        height={VERTICAL_H}
      />
    </>
  );
};
