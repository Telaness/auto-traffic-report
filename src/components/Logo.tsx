import Image from "next/image";

// ロゴ画像の実寸。next/image のレイアウト計算に使う。
const LOGO_SRC = "/favcon.jpeg";
const LOGO_WIDTH = 1280;
const LOGO_HEIGHT = 698;

type LogoProps = {
  /** 表示幅。next/image が配信サイズを選ぶのに使う（例: "320px"） */
  sizes: string;
  className?: string;
  priority?: boolean;
};

export const Logo = ({ sizes, className = "", priority = false }: LogoProps) => (
  <Image
    src={LOGO_SRC}
    alt="オトレポ"
    width={LOGO_WIDTH}
    height={LOGO_HEIGHT}
    sizes={sizes}
    priority={priority}
    className={className}
  />
);
