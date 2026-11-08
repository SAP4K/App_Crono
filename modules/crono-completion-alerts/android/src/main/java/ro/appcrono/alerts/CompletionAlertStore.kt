package ro.appcrono.alerts

import android.content.Context
import android.util.AtomicFile
import java.io.File

object CompletionAlertStore {
  private var ledger: CompletionAlertLedger? = null
  fun get(context: Context): CompletionAlertLedger {
    check(android.os.Looper.myLooper() == android.os.Looper.getMainLooper())
    return ledger ?: run {
      val file = AtomicFile(File(context.filesDir, "crono-completion-alerts-v1.json"))
      CompletionAlertLedger(read = { if (file.baseFile.exists() || File(file.baseFile.path + ".bak").exists())
        file.openRead().use { it.readBytes().toString(Charsets.UTF_8) } else null },
        write = { text ->
          val stream = file.startWrite()
          try { stream.write(text.toByteArray(Charsets.UTF_8)); file.finishWrite(stream) }
          catch (error: Exception) { file.failWrite(stream); throw error }
        }).also { ledger = it }
    }
  }
}
