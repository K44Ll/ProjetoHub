import Image from "next/image";

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <Image
        src="/projetohub-icon.png"
        alt=""
        width={32}
        height={32}
      />
    </span>
  );
}
