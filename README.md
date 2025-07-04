# Quick Start

If you want to start quickly, navigate to this repository and run the following command:

```bash
docker compose up
```

---

# 🚀 Morse Back

API backend GraphQL moderne pour l'application de chat en temps réel Morse, développée avec NestJS, TypeScript et Prisma. Support des WebSockets pour la communication en temps réel et intégration RabbitMQ pour la gestion des messages asynchrones.

## 🚀 Fonctionnalités

### 🔐 Authentification & Autorisation
- Système d'authentification JWT sécurisé
- Stratégies Passport (Local et JWT)
- Guards GraphQL pour la protection des routes
- Gestion des utilisateurs avec avatars

### 💬 Chat en temps réel
- WebSocket avec GraphQL Subscriptions
- Messages instantanés entre utilisateurs
- Conversations privées et de groupe
- Historique complet des messages

### 📊 API GraphQL
- Schema GraphQL complet avec resolvers
- Mutations pour toutes les opérations CRUD
- Subscriptions pour les mises à jour en temps réel
- DataLoader pour l'optimisation des requêtes

### 🐰 Messaging Asynchrone
- Intégration RabbitMQ pour la gestion des messages
- Queue de messages persistante
- Communication inter-services

### 💾 Base de données
- Prisma ORM avec SQLite (développement)
- Migrations automatisées
- Modèles typés pour User, Conversation et Message
- Indexation optimisée

### 🧪 Testing & Performance
- Tests unitaires avec Jest
- Tests d'intégration
- Tests end-to-end avec Puppeteer
- Tests de performance avec Artillery
- Couverture de code complète

## 🛠️ Technologies utilisées

### Backend Core
- **NestJS 11.0.1** - Framework Node.js progressif
- **TypeScript 5.7.3** - Typage statique
- **GraphQL 16.11.0** - API query language
- **Apollo Server 4.12.2** - Serveur GraphQL

### Base de données & ORM
- **Prisma 6.10.1** - ORM moderne
- **SQLite** - Base de données (développement)
- **@prisma/client** - Client Prisma généré

### Authentification
- **Passport 0.7.0** - Stratégies d'authentification
- **JWT** - Tokens d'authentification
- **bcrypt 6.0.0** - Hachage des mots de passe

### Messaging & Communication
- **RabbitMQ** via amqplib 0.10.8
- **GraphQL Subscriptions** - WebSocket en temps réel
- **DataLoader 2.2.3** - Optimisation des requêtes

### Testing & Qualité
- **Jest 29.7.0** - Framework de test
- **Artillery 2.0.23** - Tests de performance
- **Puppeteer** - Tests end-to-end
- **ESLint & Prettier** - Qualité du code

## 📋 Prérequis

- **Node.js** (version 18 ou supérieure)
- **npm** ou **yarn**
- **SQLite** (pour le développement local)
- **RabbitMQ** (optionnel, peut être lancé via Docker)
- **Docker** (optionnel pour la conteneurisation)

## 🚀 Installation et démarrage

### Option 1: Avec Docker (recommandé)

1. **Clonez le repository et naviguez dans le dossier**
   ```bash
   git clone https://github.com/Hydevs-Corp/Morse-Back.git
   cd Morse-Back
   ```

2. **Lancez l'ensemble des services**
   ```bash
   docker-compose up -d
   ```

3. **Accédez aux services**
   - Backend: `http://localhost:3001`
   - RabbitMQ Management: `http://localhost:15672` (admin/admin123)

4. **Accédez au frontend**
   - Si vous utilisez également le frontend, il sera accessible sur: `http://localhost:3000`
   - Consultez le [README de Morse-Front](https://github.com/Hydevs-Corp/Morse-Front) pour plus d'informations.

### Option 2: Installation locale (développement)

1. **Clonez le repository et naviguez dans le dossier**
   ```bash
   git clone https://github.com/Hydevs-Corp/Morse-Back.git
   cd Morse-Back
   ```

2. **Installez les dépendances**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configurez les variables d'environnement**
   ```bash
   cp .env.example .env
   # Éditez le fichier .env avec vos configurations
   ```

4. **Initialisez la base de données**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Démarrez RabbitMQ (optionnel)**
   ```bash
   docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
   ```

6. **Démarrez le serveur de développement**
   ```bash
   npm run start:dev
   ```

7. **Accédez à l'application**
   - API GraphQL: `http://localhost:3001/graphql`

---

Pour plus d'informations sur le frontend, consultez le [README de Morse-Front](https://github.com/Hydevs-Corp/Morse-Front).

### Option 3: Docker Compose (recommandé)

1. **Lancez l'ensemble de l'infrastructure**
   ```bash
   docker-compose up -d
   ```

   Cela démarre :
   - RabbitMQ avec interface de gestion
   - morse-back (API backend)
   - Configuration réseau complète

2. **Accédez aux services**
   - API Backend: `http://localhost:3000`
   - RabbitMQ Management: `http://localhost:15672` (admin/admin123)

## 🛠️ Scripts disponibles

### Développement
```bash
# Démarrage avec hot reload
npm run start:dev

# Démarrage en mode debug
npm run start:debug

# Build de production
npm run build

# Démarrage en production
npm run start:prod
```

### Base de données
```bash
# Génération du client Prisma
npx prisma generate

# Application des migrations
npx prisma migrate dev

# Reset de la base de données
npx prisma migrate reset

# Visualisation des données
npx prisma studio
```

### Tests
```bash
# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tests end-to-end
npm run test:e2e

# Tests de performance
npm run test:performance

# Tous les tests
npm run test:all

# Tests avec couverture
npm run test:cov
```

### Qualité du code
```bash
# Linting
npm run lint

# Formatage
npm run format
```

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` dans le dossier `morse-back`:

```env
# Base de données
DATABASE_URL="file:./prisma/dev.db"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# RabbitMQ
RABBITMQ_URL="amqp://admin:admin123@localhost:5672"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Port de l'application
PORT=3001

# Environnement
NODE_ENV="development"
```

### Configuration RabbitMQ

Le projet utilise RabbitMQ pour la gestion asynchrone des messages :

- **Queue**: `messages_queue`
- **Exchange**: Direct exchange
- **Routing**: Messages routés par conversation ID
- **Durabilité**: Queue persistante

### Configuration GraphQL

- **Endpoint**: `/graphql`
- **Subscriptions**: WebSocket sur le même port
- **Playground**: Activé en développement
- **Introspection**: Activée en développement

## 📁 Structure du projet

```
morse-back/
├── src/
│   ├── auth/                # Authentification (JWT, Passport)
│   ├── users/               # Gestion des utilisateurs
│   ├── conversations/       # Gestion des conversations
│   ├── messages/            # Gestion des messages
│   ├── rabbitmq/           # Configuration RabbitMQ
│   ├── pubsub/             # WebSocket subscriptions
│   ├── dataloader/         # Optimisation des requêtes
│   ├── context/            # Context GraphQL
│   ├── prisma.service.ts   # Service Prisma
│   ├── app.module.ts       # Module principal
│   └── main.ts             # Point d'entrée
├── prisma/
│   ├── schema.prisma       # Schéma de base de données
│   ├── migrations/         # Migrations Prisma
│   └── dev.db              # Base SQLite (dev)
├── test/                   # Tests e2e et configuration
├── coverage/               # Rapports de couverture
├── docker-compose.yml      # Configuration Docker Compose
├── Dockerfile              # Configuration Docker
└── package.json           # Dépendances et scripts
```

## 🧪 Tests

### Tests unitaires
```bash
npm run test:unit
```
Tests des services, resolvers et guards individuels.

### Tests d'intégration
```bash
npm run test:integration
```
Tests des interactions entre modules.

### Tests end-to-end
```bash
npm run test:e2e
```
Tests complets de l'API GraphQL avec Puppeteer.

### Tests de performance
```bash
npm run test:performance
```
Tests de charge avec Artillery pour mesurer les performances.

## 🔍 Monitoring & Debugging

### Logs
Les logs sont configurés avec les niveaux appropriés pour chaque environnement.

### Health Checks
- Endpoint de santé disponible
- Vérification de la connexion base de données
- Vérification RabbitMQ

### Métriques
- Couverture de code avec Jest
- Rapports de performance avec Artillery

## 🐛 Dépannage

### Erreurs de base de données
```bash
# Regenerer le client Prisma
npx prisma generate

# Réinitialiser la base
npx prisma migrate reset
```

### Problèmes RabbitMQ
```bash
# Vérifier le statut
docker ps | grep rabbitmq

# Redémarrer le service
docker restart morse-rabbitmq
```

### Erreurs de dépendances
```bash
# Réinstaller avec legacy peer deps
npm install --legacy-peer-deps
```

### Port déjà utilisé
```bash
# Tuer le processus sur le port 3001
npx kill-port 3001
```

## 🚀 Déploiement

### Production avec Docker
```bash
# Build de l'image de production
docker build -t morse-back:prod .

# Déploiement
docker run -d \
  --name morse-back-prod \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e DATABASE_URL="your-production-db-url" \
  morse-back:prod
```

### Variables d'environnement de production
- Utilisez une base de données PostgreSQL
- Configurez JWT_SECRET sécurisé
- Définissez CORS_ORIGIN approprié
- Activez HTTPS

## 📄 API Documentation

### GraphQL Schema
Le schema GraphQL complet est disponible via introspection à `/graphql`.

### Principales requêtes
- `users` - Liste des utilisateurs
- `conversations` - Conversations de l'utilisateur
- `messages` - Messages d'une conversation

### Principales mutations
- `login` - Authentification
- `register` - Inscription
- `sendMessage` - Envoi de message
- `createConversation` - Création de conversation

### Subscriptions
- `messageAdded` - Nouveaux messages en temps réel
- `conversationUpdated` - Mises à jour de conversation

## 🤝 Contribution

1. Fork le projet
2. Créez une branche pour votre fonctionnalité
3. Ajoutez des tests pour votre code
4. Vérifiez que tous les tests passent
5. Committez vos changements
6. Poussez vers la branche
7. Ouvrez une Pull Request

## 📄 Licence

Ce projet est développé dans un cadre éducatif.

## 👥 Auteurs

- **Sébastien Branly**
- **Guillaume Maugin**
- **Louis Réville**

---

*Développé avec ❤️ pour le projet Morse - Une API robuste pour une nouvelle façon de communiquer*
