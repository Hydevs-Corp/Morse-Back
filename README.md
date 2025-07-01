### Authentification

#### Inscription (signup)
```graphql
mutation {
  signup(email: "test@example.com", password: "motdepasse", name: "Jean") {
    user {
      id
      email
      name
    }
    token
  }
}
```

#### Connexion (signin)
```graphql
mutation {
  signin(email: "test@example.com", password: "motdepasse")
}
```

#### Récupérer l'utilisateur courant (me)
```graphql
query {
  me {
    id
    email
    name
  }
}
```

---

### Utilisateurs

#### Liste des utilisateurs
```graphql
query {
  users {
    id
    email
    name
  }
}
```

#### Un utilisateur par ID
```graphql
query {
  user(id: 1) {
    id
    email
    name
  }
}
```

---

### Conversations

#### Liste des conversations
```graphql
query {
  conversations {
    id
    participants {
      id
      email
    }
    messages {
      id
      content
    }
    createdAt
    updatedAt
  }
}
```

#### Une conversation par ID
```graphql
query {
  conversation(id: 1) {
    id
    participants {
      id
      email
    }
    messages {
      id
      content
    }
    createdAt
    updatedAt
  }
}
```

#### Créer une conversation
```graphql
mutation {
  createConversation(userId: 1, participantIds: [2, 3]) {
    id
    participants {
      id
      email
    }
  }
}
```

---

### Messages

#### Liste des messages
```graphql
query {
  messages {
    id
    content
    user {
      id
      email
    }
    conversation {
      id
    }
    createdAt
    updatedAt
  }
}
```

#### Un message par ID
```graphql
query {
  message(id: 1) {
    id
    content
    user {
      id
      email
    }
    conversation {
      id
    }
    createdAt
    updatedAt
  }
}
```

#### Créer un message
```graphql
mutation {
  createMessage(conversationId: 1, userId: 2, content: "Coucou !") {
    id
    content
    user {
      id
      email
    }
    conversation {
      id
    }
  }
}
```
