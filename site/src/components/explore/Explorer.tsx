import type { Explore } from "@/lib/explore/data";
import { ExploreGraph, ringsShown } from "./ExploreGraph";
import styles from "./explore.module.css";

// Graph + legend on the left, the connection panel on the right (stacked below 75rem). Shared by the home and the
// /explorar pages; the legend lists only what the canvas draws.
export function Explorer({ data, panel, fixed }: { data: Explore; panel: React.ReactNode; fixed?: string }) {
  const rings = ringsShown(data);
  const legend = (
    <ul className={styles.legend} aria-label="Legenda do grafo">
      <li>
        <span className={styles.swLine} aria-hidden="true" />
        Texto bíblico: referências cruzadas da OpenBible.info
      </li>
      <li>
        <span className={styles.swSel} aria-hidden="true" />
        Conexão selecionada
      </li>
      {rings.plain && (
        <li>
          <span className={styles.swRing} aria-hidden="true" />
          Capítulo, com a abreviatura do livro
        </li>
      )}
      {rings.illustrations.length > 0 && (
        <li data-illustrations="">
          <span className={styles.swIll} aria-hidden="true" />
          Ilustração por grupo de livros: {rings.illustrations.join(", ")}
        </li>
      )}
    </ul>
  );
  return (
    <div className={styles.view}>
      <div className={styles.graphCol}>
        <ExploreGraph data={data} fixed={fixed} footer={legend} />
      </div>
      <div className={styles.panelCol}>{panel}</div>
    </div>
  );
}
