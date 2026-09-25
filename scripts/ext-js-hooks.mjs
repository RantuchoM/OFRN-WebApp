import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const stub = pathToFileURL(
  join(dirname(fileURLToPath(import.meta.url)), "file-saver-stub.mjs"),
).href;

/** Permite importar los módulos del src (sin extensión) desde scripts Node. */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "file-saver") {
    return { url: stub, shortCircuit: true };
  }
  if (
    specifier.startsWith(".") &&
    !/\.(m?js|json|css|node)$/.test(specifier)
  ) {
    return nextResolve(`${specifier}.js`, context);
  }
  return nextResolve(specifier, context);
}
