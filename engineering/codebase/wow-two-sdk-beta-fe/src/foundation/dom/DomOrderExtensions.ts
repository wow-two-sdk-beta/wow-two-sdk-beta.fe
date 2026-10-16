/** Orders registered controls by their current DOM positions without mutating their registry. */
export const DomOrderExtensions = {
  inDocumentOrder<T>(items: ReadonlyArray<T>, getNode: (item: T) => Node | null | undefined): Array<T> {
    return items
      .map((item) => ({ item, node: getNode(item) }))
      .sort((a, b) => {
        if (!a.node || !b.node) return a.node ? -1 : b.node ? 1 : 0;
        const position = a.node.compareDocumentPosition(b.node);
        if (position & a.node.DOCUMENT_POSITION_DISCONNECTED) return 0;
        if (position & a.node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & a.node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      })
      .map(({ item }) => item);
  },
} as const;
