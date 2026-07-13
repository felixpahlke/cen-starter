# Deployment tools

Install both deployment clients as part of the standard workstation baseline.

## OpenShift CLI

Check first:

```bash
oc version --client
```

On macOS with Homebrew:

```bash
brew install openshift-cli
```

On any platform, prefer the target cluster's web console: open **? → Command Line Tools** and
download the matching `oc` client. Red Hat also documents installation for
[Linux, Windows, and macOS](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html-single/cli_tools/index).

Verify the client only. Log in when the deployment workflow needs it:

```bash
oc version --client
oc whoami
```

## IBM Cloud CLI and Code Engine

Install the IBM Cloud CLI using the platform command from the
[official IBM Cloud guide](https://cloud.ibm.com/docs/cli?topic=cli-getting-started). On managed
devices, prefer the approved company package.

Verify the CLI, then install only the plugins this repository uses:

```bash
ibmcloud help
ibmcloud plugin list
ibmcloud plugin install code-engine
ibmcloud plugin install container-registry
ibmcloud plugin show code-engine
ibmcloud plugin show container-registry
```

Skip a plugin when `ibmcloud plugin list` already shows it. For an IBM federated identity,
login normally uses `ibmcloud login --sso`. Do not select an account, region, or resource group
without the user.
