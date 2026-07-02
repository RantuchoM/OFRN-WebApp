import Quill from "quill";

import {
  applyCropDomPresentation,
  isFullCrop,
  parseCropAttr,
  roundAspect,
  serializeCrop,
} from "../../utils/quillImageCrop";

const Embed = Quill.import("blots/embed");

function buildImageValue(node) {
  const img = node?.tagName === "IMG" ? node : node.querySelector?.("img");
  const src = img?.getAttribute("src") || "";
  const host = img?.closest?.(".ql-image-crop, .ql-image-embed");
  const crop = parseCropAttr(host?.getAttribute("data-crop"));
  const aspect = host?.getAttribute("data-img-aspect");
  if (crop && !isFullCrop(crop)) {
    return {
      src,
      crop,
      naturalAspect: aspect ? parseFloat(aspect) : undefined,
    };
  }
  return src || null;
}

class CroppedImageBlot extends Embed {
  static create(value) {
    const node = super.create();
    node.setAttribute("contenteditable", "false");
    node.classList.add("ql-image-embed");

    const src = typeof value === "string" ? value : value?.src || "";
    const crop = typeof value === "string" ? null : value?.crop;
    const naturalAspect = typeof value === "string" ? undefined : value?.naturalAspect;

    const img = document.createElement("img");
    img.setAttribute("src", src);
    img.setAttribute("referrerpolicy", "no-referrer");
    node.appendChild(img);

    if (crop && !isFullCrop(crop)) {
      node.classList.add("ql-image-crop");
      node.setAttribute("data-crop", serializeCrop(crop));
      if (naturalAspect) node.setAttribute("data-img-aspect", String(roundAspect(naturalAspect)));
      applyCropDomPresentation(node);
    }

    return node;
  }

  static value(node) {
    return buildImageValue(node);
  }
}

CroppedImageBlot.blotName = "image";
CroppedImageBlot.tagName = "SPAN";
CroppedImageBlot.className = "ql-image-embed";

Quill.register(CroppedImageBlot, true);

const Clipboard = Quill.import("modules/clipboard");

class EntradasClipboard extends Clipboard {
  constructor(quill, options) {
    super(quill, options);

    this.addMatcher("SPAN.ql-image-crop, SPAN.ql-image-embed, DIV.ql-image-crop, DIV.ql-image-embed", (node, delta) => {
      const value = buildImageValue(node);
      if (!value) return delta;
      return new (Quill.import("delta"))().insert({ image: value });
    });

    this.addMatcher("IMG", (node, delta) => {
      const src = node.getAttribute("src") || "";
      if (!src) return delta;
      const crop = parseCropAttr(node.getAttribute("data-crop"));
      const aspect = node.getAttribute("data-img-aspect");
      const value =
        crop && !isFullCrop(crop)
          ? { src, crop, naturalAspect: aspect ? parseFloat(aspect) : undefined }
          : src;
      return new (Quill.import("delta"))().insert({ image: value });
    });
  }
}

Quill.register("modules/clipboard", EntradasClipboard, true);

export { CroppedImageBlot };
