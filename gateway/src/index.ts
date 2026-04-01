import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { execute, subscribe, parse } from 'graphql';

import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';

const PORT = process.env.PORT || 4000;

async function startServer() {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: await startStandaloneServer(
      new ApolloServer({ schema }),
      { listen: { port: PORT } }
    ).then(server => server.httpServer),
    path: '/graphql',
  });

  const serverCleanup = useServer({ schema }, wsServer);

  console.log(`🚀 Gateway ready at http://localhost:${PORT}/graphql`);
  console.log(`🔌 WebSocket ready at ws://localhost:${PORT}/graphql`);
}

startServer().catch(console.error);
