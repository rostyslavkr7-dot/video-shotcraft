import { Composition } from 'remotion';
import { AIFL_TOTAL } from './aifl/Main';
import { ThemedFilm } from './themes/ThemedFilm';
import { VerticalFilm, VERTICAL_W, VERTICAL_H } from './vertical/VerticalFilm';
import { MaxHorror, HORROR_TOTAL, HORROR_FPS, HORROR_W, HORROR_H } from './horror/MaxHorror';
import { SerumPromo, SERUM_TOTAL, SERUM_FPS, SERUM_W, SERUM_H } from './serum/SerumPromo';

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
      {/* 9:16 physical-product short (affiliate example, German copy) */}
      <Composition
        id="SerumPromo"
        component={SerumPromo}
        defaultProps={{}}
        durationInFrames={SERUM_TOTAL}
        fps={SERUM_FPS}
        width={SERUM_W}
        height={SERUM_H}
      />
      {/* 9:16 true-story horror short (Ukrainian on-screen narration) */}
      <Composition
        id="MaxHorror"
        component={MaxHorror}
        durationInFrames={HORROR_TOTAL}
        fps={HORROR_FPS}
        width={HORROR_W}
        height={HORROR_H}
      />
    </>
  );
};
