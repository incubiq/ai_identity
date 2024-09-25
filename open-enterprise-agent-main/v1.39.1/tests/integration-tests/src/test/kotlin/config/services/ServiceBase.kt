package config.services

import org.testcontainers.containers.ComposeContainer
import org.testcontainers.lifecycle.Startable
import java.io.*

abstract class ServiceBase : Startable {
    companion object {
        private val context = System.getProperties().getOrDefault("context", "")
        private val logDir = File("target/logs/$context")
        init {
            logDir.deleteRecursively()
            logDir.mkdirs()
        }
    }

    abstract val container: ComposeContainer
    abstract val keepRunning: Boolean

    open val logServices: List<String> = emptyList()
    private val logWriters: MutableList<Writer> = mutableListOf()

    override fun start() {
        logServices.forEach {
            val output = File(logDir, "$it.log")
            output.createNewFile()
            val writer = FileOutputStream(output, true).bufferedWriter()
            logWriters.add(writer)
            container.withLogConsumer(it) { logLine ->
                writer.append(logLine.utf8String)
            }
        }
        container.start()
        postStart()
    }

    open fun postStart() {
    }

    override fun stop() {
        logWriters.forEach {
            it.close()
        }
        if (!keepRunning) {
            container.stop()
        }
    }
}
