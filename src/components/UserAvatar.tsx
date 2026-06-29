import { type CSSProperties } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InitialsAvatar } from "./InitialsAvatar";

interface UserAvatarProps {
  avatarUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

// 画像あり→AvatarImage / 無い・読み込み失敗→InitialsAvatar(色生成は温存) に自動フォールバック。
// アップロード操作系(AvatarUpload)ではなく、純粋な表示用。
export function UserAvatar({
  avatarUrl,
  name,
  size = 40,
  className,
  style,
}: UserAvatarProps) {
  return (
    <Avatar style={{ width: size, height: size, ...style }} className={className}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt="" className="object-cover" />
      ) : null}
      <AvatarFallback className="bg-transparent p-0">
        <InitialsAvatar name={name} size={size} />
      </AvatarFallback>
    </Avatar>
  );
}
