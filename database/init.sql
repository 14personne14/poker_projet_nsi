/* Comment les tables SQL sont créé */

/* Table players */ 
CREATE TABLE players (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL, 
    argent INTERGET DEFAULT 0
);
