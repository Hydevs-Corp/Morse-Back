#!/bin/bash

# Script de gestion RabbitMQ pour le projet Morse

case "$1" in
    start)
        echo "🐰 Démarrage de RabbitMQ..."
        docker-compose up -d rabbitmq
        echo "✅ RabbitMQ démarré"
        echo "📊 Interface de gestion: http://localhost:15672"
        echo "👤 Username: admin"
        echo "🔑 Password: admin123"
        ;;
    stop)
        echo "🛑 Arrêt de RabbitMQ..."
        docker-compose stop rabbitmq
        echo "✅ RabbitMQ arrêté"
        ;;
    restart)
        echo "🔄 Redémarrage de RabbitMQ..."
        docker-compose restart rabbitmq
        echo "✅ RabbitMQ redémarré"
        ;;
    logs)
        echo "📋 Affichage des logs RabbitMQ..."
        docker-compose logs -f rabbitmq
        ;;
    status)
        echo "📊 Statut de RabbitMQ..."
        docker-compose ps rabbitmq
        ;;
    clean)
        echo "🧹 Nettoyage complet de RabbitMQ..."
        docker-compose down rabbitmq
        docker volume rm morse-back_rabbitmq_data morse-back_rabbitmq_logs 2>/dev/null
        echo "✅ Nettoyage terminé"
        ;;
    *)
        echo "🐰 Script de gestion RabbitMQ pour Morse"
        echo ""
        echo "Usage: $0 {start|stop|restart|logs|status|clean}"
        echo ""
        echo "Commandes:"
        echo "  start   - Démarre RabbitMQ"
        echo "  stop    - Arrête RabbitMQ"
        echo "  restart - Redémarre RabbitMQ"
        echo "  logs    - Affiche les logs en temps réel"
        echo "  status  - Affiche le statut du conteneur"
        echo "  clean   - Supprime complètement RabbitMQ et ses données"
        echo ""
        echo "Interface de gestion: http://localhost:15672"
        echo "Username: admin | Password: admin123"
        exit 1
        ;;
esac
