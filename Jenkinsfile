pipeline {
  agent any
  environment {
    DOCKER_IMAGE = "mouneeshgangadhari/group-react:${env.BUILD_NUMBER}"
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build & Push Docker image') {
      options { timeout(time: 30, unit: 'MINUTES') } // prevent forever-hanging builds
      steps {
        script {
          // Optional: enable buildx if you have it in your environment
          sh '''
            # Use buildx if available (faster builds, BuildKit)
            if docker buildx version >/dev/null 2>&1; then
              docker buildx build --platform linux/amd64 -t ${DOCKER_IMAGE} --load .
            else
              docker build -t ${DOCKER_IMAGE} .
            fi
          '''
        }
      }
    }
  }

  post {
    failure {
      echo "Build failed, printing docker info and disk usage for diagnosis"
      sh 'docker info || true'
      sh 'df -h || true'
    }
  }
}
