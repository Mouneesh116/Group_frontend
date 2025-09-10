pipeline {
  agent any
  environment {
    IMAGE_NAME = "mouneeshgangadhari/myreact"
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
        // use the environment variables so this stage is generic
        sh """
          set -euo pipefail
          echo 'Stopping and removing existing container (if any)...'
          docker rm -f "${CONTAINER}" || true

          echo 'Pulling image ${IMAGE_NAME}:latest'
          docker pull "${IMAGE_NAME}:latest"

          echo 'Running container ${CONTAINER} from ${IMAGE_NAME}:latest'
          docker run -d \\
            --name "${CONTAINER}" \\
            -p ${PORT_MAP} \\
            --restart unless-stopped \\
            ${IMAGE_NAME}:latest

          # basic health check (tries for up to ~30s)
          echo 'Waiting for container to respond on http://localhost:${PORT_MAP%%:*} ...'
          for i in \$(seq 1 15); do
            if curl -sf "http://localhost:${PORT_MAP%%:*}" >/dev/null 2>&1; then
              echo 'App is up!'
              exit 0
            fi
            sleep 2
          done

          echo 'Warning: health check failed (container may have started but is not responding)'
          # don't fail the job here; remove the next line if you want to fail the build instead:
          true
        """
      }
    }
  }

  post {
    always { cleanWs() }
  }
}
