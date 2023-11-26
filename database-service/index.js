import amqp from 'amqplib';
import cassandra from 'cassandra-driver';

const client = new cassandra.Client({
  contactPoints: ['127.0.0.1'],
  localDataCenter: 'datacenter1',
  keyspace: 'test_keyspace',
});

async function connectToRabbitMQ() {
  const connection = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const channel = await connection.createChannel();

  process.once('SIGINT', async () => {
    await channel.close();
    await connection.close();
  });

  return channel;
}

async function setupQueue(channel, queueName) {
  await channel.assertQueue(queueName, { durable: true });

  await channel.consume(
    queueName,
    async (message) => {
      if (message) {
        const data = message.content.toString();
        const user = JSON.parse(data);
        const query = `INSERT INTO test_keyspace.users(id, url, name, html) VALUES (uuid(), ?, ?, ?);`;
        await client.execute(query, [user.url, user.name, user.html], {
          prepare: true,
        });
      }
    },
    { noAck: true }
  );
}

async function main() {
  try {
    await client.connect();

    const queueName = 'users_from_habr';
    const rabbitMQChannel = await connectToRabbitMQ();

    await setupQueue(rabbitMQChannel, queueName);
  } catch (error) {
    client.shutdown();
  }
}

main();
