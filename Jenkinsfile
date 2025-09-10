pipeline {
  agent any
  environment {
<<<<<<< HEAD
    IMAGE_NAME = "shrreeeyyyyaaaaa/group_project"
=======
    IMAGE_NAME = "mouneeshgangadhari/reactapp-group"
>>>>>>> 57ab573002b2410e795c726ce5e8ba99f223c5aa
    IMAGE_TAG  = "build-${BUILD_NUMBER}"
    CONTAINER  = "reactapp"
    PORT_MAP   = "80:80"
  }
  options {
    skipDefaultCheckout(true)
    timestamps()
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build & Push Docker image') {
      steps {
        script {
          // Use your credential id here
          docker.withRegistry('', 'dockerhub-creds') {
            // build image with tag (returns a Docker image object)
            def img = docker.build("${IMAGE_NAME}:${IMAGE_TAG}")

            // push the versioned tag
            img.push()

            // also tag+push latest
            sh "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest"
            sh "docker push ${IMAGE_NAME}:latest"
          }
        }
      }
    }

    stage('Deploy on EC2') {
      steps {
        script {
          // compute host port (left side of "host:container") in Groovy to avoid shell-only expansion syntax
          def hostPort = env.PORT_MAP.tokenize(':')[0]

          sh """
            #!/usr/bin/env bash
            set -euo pipefail

            echo 'Stopping and removing existing container (if any)...'
            docker rm -f "${env.CONTAINER}" || true

            echo 'Pulling image ${env.IMAGE_NAME}:latest'
            docker pull "${env.IMAGE_NAME}:latest"

            echo 'Running container ${env.CONTAINER} from ${env.IMAGE_NAME}:latest'
            docker run -d \\
              --name "${env.CONTAINER}" \\
              -p ${env.PORT_MAP} \\
              --restart unless-stopped \\
              ${env.IMAGE_NAME}:latest

            # basic health check (tries for up to ~30s)
            echo 'Waiting for container to respond on http://localhost:${hostPort} ...'
            for i in \$(seq 1 15); do
              if curl -sf "http://localhost:${hostPort}" >/dev/null 2>&1; then
                echo 'App is up!'
                exit 0
              fi
              sleep 2
            done

            echo 'Warning: health check failed (container may have started but is not responding)'
            # keep stage non-fatal; change to "exit 1" if you want the pipeline to fail instead
            true
          """
        }
      }
    }
  }

  post {
    always { cleanWs() }
  }
}
