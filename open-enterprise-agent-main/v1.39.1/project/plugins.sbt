addSbtPlugin("com.eed3si9n" % "sbt-buildinfo" % "0.12.0")
addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.5.2")
addSbtPlugin("ch.epfl.scala" % "sbt-scalafix" % "0.12.1")
addSbtPlugin("com.github.sbt" % "sbt-release" % "1.4.0")
addSbtPlugin("com.github.sbt" % "sbt-native-packager" % "1.10.4")
addSbtPlugin("org.scoverage" % "sbt-scoverage" % "2.2.0")
addSbtPlugin("org.scoverage" % "sbt-coveralls" % "1.3.13")
addSbtPlugin("com.thesamet" % "sbt-protoc" % "1.0.6")

// In order to import proper version of com.google.protobuf.ByteString we need to add this dependency
libraryDependencies ++= Seq("com.thesamet.scalapb" %% "compilerplugin" % "0.11.17")

// Github Packages
if (sys.env.get("GITHUB_TOKEN").isDefined) {
  println(s"Enable plugin sbt-dependency-tree since env GITHUB_TOKEN is defined.")
  // The reason for this is that the plugin needs the variable to be defined. We don't want to have that requirement.
  libraryDependencies += {
    val dependency = "com.codecommit" % "sbt-github-packages" % "0.5.3"
    val sbtV = (pluginCrossBuild / sbtBinaryVersion).value
    val scalaV = (update / scalaBinaryVersion).value
    Defaults.sbtPluginExtra(dependency, sbtV, scalaV)
  }
} else libraryDependencies ++= Seq[ModuleID]()
