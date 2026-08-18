import networkx as nx

def bfs_traversal(G: nx.DiGraph, start_node: str):
    return list(nx.descendants(G, start_node))
